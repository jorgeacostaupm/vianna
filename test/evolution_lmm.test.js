import test from "node:test";
import assert from "node:assert/strict";

import { fitRandomInterceptLmm } from "../src/utils/evolution_lmm.js";

function buildDataset({ nSubjects = 30, times = [0, 1, 2, 3], oneGroup = false } = {}) {
  const rows = [];
  for (let i = 0; i < nSubjects; i += 1) {
    const id = `S${i + 1}`;
    const group = oneGroup ? "A" : i % 2 === 0 ? "A" : "B";
    const age = 55 + (i % 11);
    const sex = i % 3 === 0 ? "M" : "F";
    const randIntercept = (i % 7) * 0.4;

    times.forEach((time) => {
      const timeNum = Number(time);
      const groupEffect = group === "B" ? 1.2 : 0;
      const interaction = group === "B" ? 0.5 * timeNum : 0;
      const sexEffect = sex === "M" ? 0.8 : 0;
      const noise = ((i + 3) * (timeNum + 2)) % 5;
      const outcome =
        10 + 1.8 * timeNum + groupEffect + interaction + 0.07 * age + sexEffect + randIntercept + noise * 0.03;

      rows.push({
        id,
        group,
        time: timeNum,
        outcome,
        age,
        sex,
      });
    });
  }
  return rows;
}

function fit(overrides = {}) {
  const rows = overrides.rawRows || buildDataset();
  return fitRandomInterceptLmm({
    rawRows: rows,
    times: [0, 1, 2, 3],
    outcomeVar: "outcome",
    idVar: "id",
    timeVar: "time",
    groupVar: "group",
    includeGroupEffect: true,
    covariates: [],
    includeTimeGroupInteraction: false,
    timeCoding: "continuous",
    referenceGroup: "A",
    referenceMode: "group",
    declaredVarTypes: {
      outcome: "number",
      id: "string",
      time: "number",
      group: "string",
      age: "number",
      sex: "string",
    },
    ...overrides,
  });
}

test("LMM base model with time only", () => {
  const result = fit({
    includeGroupEffect: false,
    groupVar: null,
  });

  assert.equal(result.method, "REML");
  assert.equal(result.includeGroupEffect, false);
  assert.equal(result.timeCoding, "continuous");
  assert.ok(result.fixedEffects.some((effect) => effect.name === "Time"));
});

test("LMM includes fixed group effect", () => {
  const result = fit();
  assert.equal(result.includeGroupEffect, true);
  assert.ok(
    result.fixedEffects.some((effect) => effect.name.startsWith("Group:")),
  );
});

test("LMM includes numeric covariate", () => {
  const result = fit({ covariates: ["age"] });
  assert.ok(
    result.fixedEffects.some((effect) => effect.name.includes("Covariate: age")),
  );
});

test("LMM includes categorical covariate", () => {
  const result = fit({ covariates: ["sex"] });
  assert.ok(
    result.fixedEffects.some((effect) => effect.name.includes("Covariate: sex")),
  );
});

test("LMM supports time by group interaction", () => {
  const result = fit({ includeTimeGroupInteraction: true });
  assert.equal(result.includeInteraction, true);
  assert.ok(
    result.fixedEffects.some((effect) => effect.name.startsWith("Time × Group:")),
  );
});

test("LMM filters complete-case rows and reports filtered counts", () => {
  const rows = buildDataset();
  rows[0].age = null;
  rows[1].outcome = undefined;
  const result = fit({ rawRows: rows, covariates: ["age"] });

  assert.ok(result.filteredData.rowsAfterCompleteCase < result.filteredData.rowsBeforeFiltering);
  assert.ok(result.filteredData.rowsAfterSubjectFilter <= result.filteredData.rowsAfterCompleteCase);
});

test("LMM ICC is computed from variance components", () => {
  const result = fit();
  const expected =
    result.variance.randomIntercept /
    (result.variance.randomIntercept + result.variance.residual);
  assert.ok(Math.abs(result.variance.icc - expected) < 1e-10);
});

test("LMM fails with insufficient group levels", () => {
  assert.throws(
    () =>
      fit({
        rawRows: buildDataset({ oneGroup: true }),
        includeGroupEffect: true,
      }),
    /insufficient levels/i,
  );
});

test("LMM blocks invalid covariate selections", () => {
  assert.throws(
    () => fit({ covariates: ["outcome"] }),
    /invalid covariate selection/i,
  );
});

test("LMM can fail to fit under collinearity and throws clearly", () => {
  const rows = buildDataset();
  rows.forEach((row) => {
    row.group_copy = row.group;
  });

  assert.throws(
    () =>
      fit({
        rawRows: rows,
        covariates: ["group_copy"],
        declaredVarTypes: {
          outcome: "number",
          id: "string",
          time: "number",
          group: "string",
          group_copy: "string",
        },
      }),
    /failed|Not enough observations|covariance/i,
  );
});
