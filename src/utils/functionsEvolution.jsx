import * as aq from "arquero";
import { jStat } from "jstat";
import { sortTimeValues } from "@/utils/evolutionTimeOrder";

export function getCompleteSubjects(participantData, times) {
  const timeKeys = (times || []).map((t) => String(t));
  const completeSubjects = (participantData || []).filter((p) =>
    timeKeys.every((t) => {
      const entry = p.values.find((v) => String(v.timestamp) === t);
      const value = entry?.value;
      return value !== null && value !== undefined && !Number.isNaN(+value);
    }),
  );

  return {
    completeSubjects,
    excluded: (participantData?.length || 0) - completeSubjects.length,
  };
}

export function runRMAnova(participantData, times) {
  // ----------------------------------------
  // 1. Filtrar sujetos con datos completos
  // ----------------------------------------
  const { completeSubjects, excluded } = getCompleteSubjects(
    participantData,
    times,
  );

  const subjects = completeSubjects.length;
  const groups = [...new Set(completeSubjects.map((p) => p.group))];
  const G = groups.length;
  const T = times.length;

  if (subjects < 2 || T < 2) {
    return {
      error:
        "At least two subjects with complete measurements and at least two time points are required.",
    };
  }

  // ----------------------------------------
  // 2. Construir matrices
  // ----------------------------------------
  const Y = completeSubjects.map((p) =>
    times.map((t) => +p.values.find((v) => v.timestamp === t).value),
  );

  // ----------------------------------------
  // 3. Medias
  // ----------------------------------------
  const grandMean = Y.flat().reduce((a, b) => a + b, 0) / (subjects * T);

  const timeMeans = times.map((_, ti) => jStat.mean(Y.map((row) => row[ti])));

  const groupMeans = groups.map((g) => {
    const vals = completeSubjects
      .filter((p) => p.group === g)
      .flatMap((p) =>
        times.map((t) => +p.values.find((v) => v.timestamp === t).value),
      );
    return jStat.mean(vals);
  });

  const cellMeans = groups.map((g) =>
    times.map((t) => {
      const vals = completeSubjects
        .filter((p) => p.group === g)
        .map((p) => +p.values.find((v) => v.timestamp === t).value);
      return jStat.mean(vals);
    }),
  );

  // ----------------------------------------
  // 4. Sumas de cuadrados
  // ----------------------------------------
  const ssTime =
    subjects * timeMeans.reduce((acc, mt) => acc + (mt - grandMean) ** 2, 0);

  const ssGroup =
    T * groupMeans.reduce((acc, mg) => acc + (mg - grandMean) ** 2, 0);

  let ssInteraction = 0;
  for (let gi = 0; gi < G; gi++) {
    for (let ti = 0; ti < T; ti++) {
      ssInteraction +=
        (cellMeans[gi][ti] - groupMeans[gi] - timeMeans[ti] + grandMean) ** 2;
    }
  }
  ssInteraction *= subjects / G;

  let ssError = 0;
  completeSubjects.forEach((p) => {
    const subjMean =
      times.reduce(
        (a, t) => a + +p.values.find((v) => v.timestamp === t).value,
        0,
      ) / T;

    times.forEach((t) => {
      const v = +p.values.find((x) => x.timestamp === t).value;
      ssError += (v - subjMean) ** 2;
    });
  });

  // ----------------------------------------
  // 5. Grados de libertad
  // ----------------------------------------
  const dfTime = T - 1;
  const dfGroup = G - 1;
  const dfInteraction = dfGroup * dfTime;
  const dfError = (subjects - G) * dfTime;

  // ----------------------------------------
  // 6. Estadísticos
  // ----------------------------------------
  const msTime = ssTime / dfTime;
  const msGroup = ssGroup / dfGroup;
  const msInteraction = ssInteraction / dfInteraction;
  const msError = ssError / dfError;

  const Ftime = msTime / msError;
  const Fgroup = msGroup / msError;
  const Finteraction = msInteraction / msError;

  const pTime = 1 - jStat.centralF.cdf(Ftime, dfTime, dfError);
  const pGroup = 1 - jStat.centralF.cdf(Fgroup, dfGroup, dfError);
  const pInteraction =
    1 - jStat.centralF.cdf(Finteraction, dfInteraction, dfError);

  const etaTime = ssTime / (ssTime + ssError);
  const etaGroup = ssGroup / (ssGroup + ssError);
  const etaInteraction = ssInteraction / (ssInteraction + ssError);

  // ----------------------------------------
  // 7. HTML separado
  // ----------------------------------------
  const html = renderRMAnovaHTML({
    groups,
    times,
    cellMeans,
    dfTime,
    dfGroup,
    dfInteraction,
    dfError,
    Ftime,
    Fgroup,
    Finteraction,
    pTime,
    pGroup,
    pInteraction,
    etaTime,
    etaGroup,
    etaInteraction,
    excluded,
  });

  return {
    Ftime,
    Fgroup,
    Finteraction,
    pTime,
    pGroup,
    pInteraction,
    etaTime,
    etaGroup,
    etaInteraction,
    dfTime,
    dfGroup,
    dfInteraction,
    dfError,
    groups,
    times,
    cellMeans,
    subjects,
    excludedSubjects: excluded,
    html,
    completeSubjects,
  };
}

function renderRMAnovaHTML({
  groups,
  times,
  cellMeans,
  dfTime,
  dfGroup,
  dfInteraction,
  dfError,
  Ftime,
  Fgroup,
  Finteraction,
  pTime,
  pGroup,
  pInteraction,
  etaTime,
  etaGroup,
  etaInteraction,
  excluded,
}) {
  return (
    <div
      style={{
        fontSize: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <b>Repeated Measures ANOVA</b>

      {excluded > 0 && (
        <div style={{ color: "#a00" }}>
          {excluded} subject(s) excluded due to incomplete data. The visualized
          data differs with these results.
        </div>
      )}

      <div style={{ display: "flex", gap: "40px" }}>
        <StatBlock
          title="Time Effect"
          df1={dfTime}
          df2={dfError}
          F={Ftime}
          p={pTime}
          eta={etaTime}
        />
        <StatBlock
          title="Group Effect"
          df1={dfGroup}
          df2={dfError}
          F={Fgroup}
          p={pGroup}
          eta={etaGroup}
        />
      </div>

      <hr />

      <StatBlock
        title="Group × Time Interaction"
        df1={dfInteraction}
        df2={dfError}
        F={Finteraction}
        p={pInteraction}
        eta={etaInteraction}
        centered
      />

      <hr />

      <b>Group × Time Means</b>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          columnGap: "40px",
          rowGap: "12px",
        }}
      >
        {groups.map((g, gi) => (
          <div key={g}>
            <b>{g}</b>
            <div style={{ paddingLeft: "1em" }}>
              {times.map((t, ti) => (
                <div key={ti}>
                  <b>{t}:</b> {cellMeans[gi][ti].toFixed(2)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBlock({ title, df1, df2, F, p, eta, centered }) {
  return (
    <div style={{ textAlign: centered ? "center" : "left" }}>
      <b>{title}</b>
      <div>
        F({df1}, {df2}) = {F.toFixed(2)}
      </div>
      <div>p = {p.toFixed(4)}</div>
      <div>η² = {eta.toFixed(3)}</div>
    </div>
  );
}

function buildCi95(mean, std, n) {
  if (!Number.isFinite(mean)) return { lower: NaN, upper: NaN };
  if (!Number.isFinite(std) || !Number.isFinite(n) || n <= 1) {
    return { lower: mean, upper: mean };
  }
  const tCrit = jStat.studentt.inv(0.975, n - 1);
  if (!Number.isFinite(tCrit)) return { lower: mean, upper: mean };
  const se = std / Math.sqrt(n);
  return { lower: mean - tCrit * se, upper: mean + tCrit * se };
}

export function getLineChartData(
  raw,
  valueVar,
  groupVar,
  timeVar,
  idVar,
  showComplete,
  tests = [],
  timeRange = null,
  timeOrderConfig = null,
  testOptions = null,
  varTypes = null,
) {
  if (!raw || !Array.isArray(raw)) {
    return { meanData: [], participantData: [], tests: [], rmAnova: null };
  }

  if (!valueVar || !groupVar || !timeVar || !idVar) {
    console.error("[getLineChartData] missing required variable", {
      valueVar,
      groupVar,
      timeVar,
      idVar,
    });
    throw new Error("Must set valueVar, groupVar, timeVar and idVar");
  }

  const isValidColumnName = (name) =>
    typeof name === "string" && name.trim().length > 0;
  const columns = raw.length > 0 ? Object.keys(raw[0]) : [];

  const requiredColumns = [
    { name: valueVar, role: "value" },
    { name: groupVar, role: "group" },
    { name: timeVar, role: "time" },
    { name: idVar, role: "id" },
  ];

  requiredColumns.forEach(({ name, role }) => {
    if (!isValidColumnName(name)) {
      console.error("[getLineChartData] invalid column name", { role, name });
      throw new Error(`Invalid ${role} variable: empty column name.`);
    }
    if (columns.length > 0 && !columns.includes(name)) {
      console.error("[getLineChartData] column not found in raw", {
        role,
        name,
        columns,
      });
      throw new Error(`Invalid ${role} variable: "${name}" is not a column.`);
    }
  });

  let table = aq.from(raw);
  const allTimes = sortTimeValues(
    raw.map((row) => row?.[timeVar]),
    timeOrderConfig,
  );
  const rankByTime = new Map(
    allTimes.map((time, index) => [String(time), index]),
  );
  const compareByTimeRank = (a, b) => {
    const timeA = String(a);
    const timeB = String(b);
    const rankA = rankByTime.has(timeA)
      ? rankByTime.get(timeA)
      : Number.MAX_SAFE_INTEGER;
    const rankB = rankByTime.has(timeB)
      ? rankByTime.get(timeB)
      : Number.MAX_SAFE_INTEGER;

    if (rankA !== rankB) return rankA - rankB;
    return timeA.localeCompare(timeB, undefined, { numeric: true });
  };

  // Agrupar por participante
  const groupedById = table
    .groupby(idVar)
    .select(idVar, groupVar, timeVar, valueVar)
    .objects({ grouped: "entries" });
  let participantData = groupedById.map(([id, rows]) => {
    const values = rows
      .map((r) => ({
        timestamp: String(r[timeVar]),
        value: r[valueVar],
      }))
      .sort((a, b) => compareByTimeRank(a.timestamp, b.timestamp));

    const group = rows.length > 0 ? rows[0][groupVar] : null;

    return { id, group, values };
  });

  let completeIds = null;
  if (showComplete) {
    const beforeCount = participantData.length;
    const completeParticipants = participantData.filter((p) =>
      allTimes.every((t) =>
        p.values.some(
          (v) => v.timestamp === t && v.value !== null && !isNaN(v.value),
        ),
      ),
    );
    completeIds = new Set(completeParticipants.map((p) => p.id));
    participantData = completeParticipants;

    let tmp = raw.filter((r) => completeIds.has(r[idVar]));
    table = aq.from(tmp);

    console.log("[Evolution] Relevant data selection applied", {
      participantsBefore: beforeCount,
      participantsAfter: participantData.length,
      excludedParticipants: beforeCount - participantData.length,
      filteredRows: tmp.length,
    });
  }

  // Agregar medias, desviaciones y conteo
  const aggregated = table
    .groupby(groupVar, timeVar)
    .rollup({
      mean: aq.op.mean(valueVar),
      std: aq.op.stdev(valueVar),
      count: aq.op.count(),
    })
    .objects();

  const groupsMap = new Map();
  for (const row of aggregated) {
    const g = row[groupVar];
    const t = String(row[timeVar]);
    const mean = row.mean;
    const std = row.std;
    const n = row.count;

    const ci95 = buildCi95(mean, std, n);

    const v = { mean, std, count: n, ci95 };

    if (!groupsMap.has(g)) groupsMap.set(g, []);
    groupsMap.get(g).push({ time: t, value: v });
  }

  const meanData = [...groupsMap.entries()].map(([group, values]) => ({
    group,
    values: values.sort((a, b) => compareByTimeRank(a.time, b.time)),
  }));

  const overallAggregated = table
    .groupby(timeVar)
    .rollup({
      mean: aq.op.mean(valueVar),
      std: aq.op.stdev(valueVar),
      count: aq.op.count(),
    })
    .objects();

  const overallMeanData = {
    group: "All",
    label: "All",
    values: overallAggregated
      .map((row) => {
        const time = String(row[timeVar]);
        const mean = row.mean;
        const std = row.std;
        const count = row.count;
        return {
          time,
          value: {
            mean,
            std,
            count,
            ci95: buildCi95(mean, std, count),
          },
        };
      })
      .sort((a, b) => compareByTimeRank(a.time, b.time)),
  };

  const testResults = Array.isArray(tests)
    ? tests.map((test) => {
        const {
          id,
          label,
          description,
          referenceUrl,
          scope,
          variant,
          minTimepoints,
          minSubjects,
        } = test;
        const meta = {
          id,
          label,
          description,
          referenceUrl,
          scope,
          variant,
          minTimepoints,
          minSubjects,
        };

        try {
          const result = test.run({
            rawRows: raw,
            participantData,
            times: allTimes,
            groupVar,
            timeVar,
            idVar,
            variable: valueVar,
            varTypes,
            timeRange,
            testOptions,
          });
          const error = result?.error;
          return { ...meta, result, error };
        } catch (error) {
          console.error("[getLineChartData] test failed", {
            id,
            error,
          });
          return {
            ...meta,
            error: error?.message || "Error running test.",
          };
        }
      })
    : [];

  const rmAnova =
    testResults.find((test) => test.id === "rm-anova")?.result || null;
  const lmm =
    testResults.find((test) => test.id === "lmm-random-intercept")?.result ||
    null;

  return {
    meanData,
    overallMeanData,
    participantData,
    tests: testResults,
    rmAnova,
    lmm,
    times: allTimes,
  };
}
