import { getCompleteSubjects, runRMAnova } from "@/utils/functionsEvolution";
import { friedmanTest } from "@/utils/tests/numerical/friedman";
import { mauchlyTest } from "@/utils/tests/numerical/Mauchly";
import { pairedTTest } from "@/utils/tests/numerical/PairedStudentT";
import { signTest } from "@/utils/tests/numerical/SignTest";
import { fitRandomInterceptLmm } from "@/utils/evolution_lmm";
import { ownMean } from "./OwnMean";

const UNKNOWN_GROUP = "All";

function buildTimeGroups(completeSubjects, times) {
  return times.map((t) => ({
    name: String(t),
    values: completeSubjects.map((p) => {
      const entry = p.values.find((v) => String(v.timestamp) === String(t));
      return entry ? +entry.value : NaN;
    }),
  }));
}

function resolveTimePair(times, timeRange) {
  const available = (times || []).map((t) => String(t));
  if (available.length < 2) {
    return { error: "At least two time points are required." };
  }

  const from =
    timeRange?.from != null ? String(timeRange.from) : available[0];
  const to =
    timeRange?.to != null
      ? String(timeRange.to)
      : available[available.length - 1];

  if (!available.includes(from) || !available.includes(to)) {
    return { error: "Selected time points are not available." };
  }

  if (from === to) {
    return { error: "Select two different time points for paired tests." };
  }

  return { from, to };
}

function runPerGroupTest({ participantData, times }, test, options = {}) {
  const minTimepoints = options.minTimepoints ?? 2;
  const minSubjects = options.minSubjects ?? 2;

  if (!participantData || participantData.length === 0) {
    return { error: "No data available for this test." };
  }

  if (!times || times.length === 0) {
    return { error: "No time points available for this test." };
  }

  const groupsMap = new Map();
  participantData.forEach((p) => {
    const key = p.group ?? UNKNOWN_GROUP;
    if (!groupsMap.has(key)) groupsMap.set(key, []);
    groupsMap.get(key).push(p);
  });

  const groupResults = [...groupsMap.entries()].map(([group, participants]) => {
    const { completeSubjects, excluded } = getCompleteSubjects(
      participants,
      times
    );
    const n = completeSubjects.length;
    const k = times.length;

    if (k < minTimepoints) {
      return {
        group,
        n,
        k,
        excluded,
        error: `Requires at least ${minTimepoints} time points.`,
      };
    }

    if (n < minSubjects) {
      return {
        group,
        n,
        k,
        excluded,
        error: `Requires at least ${minSubjects} complete subjects.`,
      };
    }

    try {
      const groups = buildTimeGroups(completeSubjects, times);
      const result = test.run(groups);
      return { group, n, k, excluded, result };
    } catch (error) {
      return {
        group,
        n,
        k,
        excluded,
        error: error?.message || "Error running test.",
      };
    }
  });

  return { groups: groupResults };
}

function runPairedTimeTest(
  { participantData, times, timeRange },
  test,
  options = {}
) {
  const minSubjects = options.minSubjects ?? 2;

  if (!participantData || participantData.length === 0) {
    return { error: "No data available for this test." };
  }

  const { from, to, error } = resolveTimePair(times, timeRange);
  if (error) return { error };

  const groupsMap = new Map();
  participantData.forEach((p) => {
    const key = p.group ?? UNKNOWN_GROUP;
    if (!groupsMap.has(key)) groupsMap.set(key, []);
    groupsMap.get(key).push(p);
  });

  const pairTimes = [from, to];
  const groupResults = [...groupsMap.entries()].map(([group, participants]) => {
    const { completeSubjects, excluded } = getCompleteSubjects(
      participants,
      pairTimes
    );
    const n = completeSubjects.length;

    if (n < minSubjects) {
      return {
        group,
        n,
        k: pairTimes.length,
        excluded,
        error: `Requires at least ${minSubjects} complete subjects.`,
      };
    }

    try {
      const groups = buildTimeGroups(completeSubjects, pairTimes);
      const result = test.run(groups);
      return { group, n, k: pairTimes.length, excluded, result };
    } catch (err) {
      return {
        group,
        n,
        k: pairTimes.length,
        excluded,
        error: err?.message || "Error running test.",
      };
    }
  });

  return { pairTimes, groups: groupResults };
}

const rmAnovaTest = {
  id: "rm-anova",
  label: "RM ANOVA",
  description:
    "Two-way repeated-measures ANOVA with group, time, and interaction effects.",
  referenceUrl: "https://search.r-project.org/R/refmans/stats/html/aov.html",
  scope: null,
  variant: "rm-anova",
  minTimepoints: 2,
  minSubjects: 2,
  run: ({ participantData, times }) => {
    if (!participantData || participantData.length === 0) {
      return { error: "No data available for this test." };
    }
    if (!times || times.length === 0) {
      return { error: "No time points available for this test." };
    }
    return runRMAnova(participantData, times);
  },
};

const lmmRandomIntercept = {
  id: "lmm-random-intercept",
  label: "LMM (Random Intercept)",
  description:
    "Random-intercept mixed model (REML) with fixed time, optional group interaction, and user-selected covariates.",
  referenceUrl:
    "https://en.wikipedia.org/wiki/Mixed_model#Linear_mixed_model",
  scope: null,
  variant: "lmm",
  minTimepoints: 2,
  minSubjects: 2,
  // Supported formula in this first version:
  // y ~ time + group + covariates + optional(time:group) + (1|subject)
  // Out of scope: random slopes, nested random effects, complex residual covariance,
  // free-form formulas and automatic model selection/imputation.
  run: ({ participantData, times, testOptions, rawRows, groupVar, timeVar, idVar, variable, varTypes }) => {
    if (!participantData || participantData.length === 0) {
      return { error: "No data available for this test." };
    }
    if (!times || times.length === 0) {
      return { error: "No time points available for this test." };
    }

    const rows = Array.isArray(rawRows) ? rawRows : [];
    if (!rows.length) {
      return { error: "No data available for this test." };
    }

    if (!variable || !idVar || !timeVar) {
      return { error: "Missing required model variables (outcome, subject ID, or time)." };
    }

    const configuredCovariates = Array.isArray(testOptions?.lmmCovariates)
      ? testOptions.lmmCovariates
      : [];
    const blocked = new Set([variable, idVar, timeVar, groupVar].filter(Boolean));
    const covariates = configuredCovariates.filter((name) => !blocked.has(name));

    if (covariates.length !== configuredCovariates.length) {
      return {
        error:
          "Invalid covariate selection. Outcome, Subject ID, Time, and Group cannot be selected as covariates.",
      };
    }

    const includeInteraction = Boolean(testOptions?.lmmIncludeInteraction && groupVar);
    const requestedTimeCoding =
      testOptions?.lmmTimeCoding === "continuous" ||
      testOptions?.lmmTimeCoding === "ordered-index"
        ? testOptions.lmmTimeCoding
        : "auto";

    const selectedGroup =
      testOptions?.lmmReferenceGroup != null &&
      String(testOptions.lmmReferenceGroup).trim() !== ""
        ? String(testOptions.lmmReferenceGroup)
        : UNKNOWN_GROUP;

    if (
      selectedGroup !== UNKNOWN_GROUP &&
      !participantData.some(
        (participant) =>
          String(participant?.group ?? UNKNOWN_GROUP) === selectedGroup,
      )
    ) {
      return {
        error: `Selected LMM group does not exist in current data: ${selectedGroup}.`,
      };
    }

    const result = fitRandomInterceptLmm({
      rawRows: rows,
      times,
      outcomeVar: variable,
      idVar,
      timeVar,
      groupVar,
      includeGroupEffect: Boolean(groupVar),
      covariates,
      includeTimeGroupInteraction: includeInteraction,
      timeCoding: requestedTimeCoding,
      declaredVarTypes: varTypes || null,
      referenceGroup:
        selectedGroup === UNKNOWN_GROUP ? null : selectedGroup,
      referenceMode: selectedGroup === UNKNOWN_GROUP ? "all" : "group",
    });

    return {
      ...result,
      selectedGroup,
      covariates,
      selectionMode: selectedGroup === UNKNOWN_GROUP ? "all" : "group",
    };
  },
};

const friedmanEvolution = {
  id: friedmanTest.id,
  label: friedmanTest.label,
  description:
    "Non-parametric repeated-measures test across time within each group.",
  referenceUrl:
    "https://stat.ethz.ch/R-manual/R-devel/library/stats/html/friedman.test.html",
  scope: "Within-group",
  variant: "per-group",
  minTimepoints: 3,
  minSubjects: 2,
  run: (ctx) =>
    runPerGroupTest(ctx, friedmanTest, {
      minTimepoints: 3,
      minSubjects: 2,
    }),
};

const mauchlyEvolution = {
  id: mauchlyTest.id,
  label: mauchlyTest.label,
  description: "Sphericity test across time within each group.",
  referenceUrl:
    "https://search.r-project.org/R/refmans/stats/html/mauchly.test.html",
  scope: "Within-group",
  variant: "per-group",
  minTimepoints: 3,
  minSubjects: 3,
  run: (ctx) =>
    runPerGroupTest(ctx, mauchlyTest, { minTimepoints: 3, minSubjects: 3 }),
};

const pairedTTestEvolution = {
  id: pairedTTest.id,
  label: pairedTTest.label,
  description: "Paired comparison between two time points within each group.",
  referenceUrl:
    "https://search.r-project.org/CRAN/refmans/stats/html/t.test.html",
  scope: "Within-group",
  variant: "paired",
  minTimepoints: 2,
  minSubjects: 2,
  run: (ctx) =>
    runPairedTimeTest(ctx, pairedTTest, {
      minSubjects: 2,
    }),
};

const signTestEvolution = {
  id: signTest.id,
  label: signTest.label,
  description: "Non-parametric paired test using signs of differences.",
  referenceUrl:
    "https://www.itl.nist.gov/div898/software/dataplot/refman1/auxillar/signtest.htm",
  scope: "Within-group",
  variant: "paired",
  minTimepoints: 2,
  minSubjects: 2,
  run: (ctx) => runPairedTimeTest(ctx, signTest, { minSubjects: 2 }),
};

const evolutionTests = [
  lmmRandomIntercept,
  rmAnovaTest,
  friedmanEvolution,
  mauchlyEvolution,
  pairedTTestEvolution,
  signTestEvolution,
];

export { evolutionTests, ownMean };
export default evolutionTests;
