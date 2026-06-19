import test from "node:test";
import assert from "node:assert/strict";

import { fitRandomInterceptLmm } from "./evolution_lmm.js";

const RAW_ROWS = [
  { id: "A1", time: 0, group: "A", score: 0.0 },
  { id: "A1", time: 1, group: "A", score: 2.1 },
  { id: "B1", time: 0, group: "B", score: 30.0 },
  { id: "B1", time: 1, group: "B", score: 31.9 },
  { id: "B2", time: 0, group: "B", score: 29.8 },
  { id: "B2", time: 1, group: "B", score: 32.1 },
  { id: "B3", time: 0, group: "B", score: 30.2 },
  { id: "B3", time: 1, group: "B", score: 31.8 },
];

function getPredictionFit(result, group, time) {
  return result.predictions
    .find((entry) => entry.group === group)
    ?.values.find((entry) => String(entry.time) === String(time))?.fit;
}

function assertApprox(actual, expected, tolerance, message) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected} ± ${tolerance}, received ${actual}`,
  );
}

test("LMM with referenceMode=all uses a global intercept instead of a group baseline", () => {
  const result = fitRandomInterceptLmm({
    rawRows: RAW_ROWS,
    times: [0, 1],
    outcomeVar: "score",
    idVar: "id",
    timeVar: "time",
    groupVar: "group",
    includeGroupEffect: true,
    timeCoding: "continuous",
    referenceMode: "all",
  });

  assert.equal(result.selectedGroup, "All");
  assert.equal(result.groupCoding, "effect");
  assert.equal(result.metadata.groupReference, "All");
  assert.equal(result.metadata.groupCoding, "effect");

  const intercept = result.fixedEffects.find(
    (effect) => effect.name === "Intercept",
  )?.estimate;
  const allAtBaseline = getPredictionFit(result, "All", 0);
  const groupAAtBaseline = getPredictionFit(result, "A", 0);
  const groupBAtBaseline = getPredictionFit(result, "B", 0);

  assertApprox(intercept, 15, 0.75, "effect-coded intercept");
  assertApprox(allAtBaseline, intercept, 0.25, "All prediction at baseline");
  assertApprox(groupAAtBaseline, 0, 0.75, "group A prediction at baseline");
  assertApprox(groupBAtBaseline, 30, 0.75, "group B prediction at baseline");
});

test("LMM with a concrete reference group keeps treatment-coded baseline behaviour", () => {
  const result = fitRandomInterceptLmm({
    rawRows: RAW_ROWS,
    times: [0, 1],
    outcomeVar: "score",
    idVar: "id",
    timeVar: "time",
    groupVar: "group",
    includeGroupEffect: true,
    timeCoding: "continuous",
    referenceGroup: "A",
    referenceMode: "group",
  });

  assert.equal(result.selectedGroup, "A");
  assert.equal(result.groupCoding, "treatment");
  assert.equal(result.metadata.groupReference, "A");
  assert.equal(result.metadata.groupCoding, "treatment");

  const intercept = result.fixedEffects.find(
    (effect) => effect.name === "Intercept",
  )?.estimate;
  const groupAAtBaseline = getPredictionFit(result, "A", 0);
  const groupBAtBaseline = getPredictionFit(result, "B", 0);

  assertApprox(intercept, 0, 0.75, "treatment-coded intercept");
  assertApprox(groupAAtBaseline, intercept, 0.25, "reference group baseline");
  assertApprox(groupBAtBaseline, 30, 0.75, "non-reference group baseline");
});
