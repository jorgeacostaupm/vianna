import { createAsyncThunk } from "@reduxjs/toolkit";
import * as aq from "arquero";

import tests from "@/utils/tests";
import { runLevene, runShapiroWilk } from "@/utils/stats";

export const runAllComparisonTests = createAsyncThunk(
  "compare/runAllComparisonTests",
  async (payload, { rejectWithValue }) => {
    try {
      const { selection, groupVar, variables, test } = payload;
      const testObj = tests.find((t) => t.label === test);

      const table = aq.from(selection);
      const gTable = table.groupby(groupVar);
      const raw = gTable.objects({ grouped: "entries" });
      const allVars = variables;

      const data = [];

      for (const variable of allVars) {
        const groups = raw.map(([name, rows]) => ({
          name,
          values: rows.map((r) => r[variable]),
        }));

        const res = testObj.run(groups);
        data.push({
          variable,
          value: res.metric.value,
          p_value: res.pValue,
          ...res,
        });
      }
      return { data: data, measure: testObj.metric.symbol };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const runComparisonTest = createAsyncThunk(
  "compare/runTest",
  async (payload, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const variable = state.compare.selectedVar;
      const selectedTest = state.compare.selectedTest;
      const groupVar = state.compare.groupVar;
      if (!groupVar) {
        throw new Error("Group variable is not set for comparison.");
      }

      const table = aq.from(payload.selection);
      const gTable = table.groupby(groupVar);
      const rawGroups = gTable.objects({ grouped: "entries" });

      const groups = rawGroups.map(([name, rows]) => ({
        name,
        values: rows.map((r) => r[variable]),
      }));

      const testObj = tests.find((t) => t.label === selectedTest);
      if (!testObj) {
        throw new Error(`Test no encontrado: ${selectedTest}`);
      }
      const result = testObj.run(groups);
      return result;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const checkAssumptions = createAsyncThunk(
  "compare/checkAssumptions",
  async (_, { getState, rejectWithValue }) => {
    try {
      const { selection } = getState().dataframe;
      const { groupVar, selectedVar } = getState().compare;
      if (!groupVar) {
        throw new Error("Group variable is not set for assumptions.");
      }

      const table = aq.from(selection);
      const raw = table.groupby(groupVar).objects({ grouped: "entries" });

      const groups = raw.map(([name, rows]) => ({
        name,
        values: rows.map((r) => r[selectedVar]),
      }));

      const normality = groups.map((g) => {
        const { W, pValue, normal } = runShapiroWilk(g.values);
        return { group: g.name, W, pValue, normal };
      });

      const {
        F,
        pValue: levP,
        equalVariance,
      } = runLevene(groups.map((g) => g.values));

      return { normality, equalVariance, levP, F };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);
