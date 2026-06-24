import { createAsyncThunk } from "@reduxjs/toolkit";
import * as aq from "arquero";

import { runLevene, runShapiroWilk } from "@/utils/stats";
import { selectSelection } from "../dataframe/selectors";
import { selectCompareAnalysisContext } from "../main";

export const checkAssumptions = createAsyncThunk(
  "compare/checkAssumptions",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const selection = selectSelection(state);
      const { groupVar } = selectCompareAnalysisContext(state);
      const { selectedVar } = state.compare;
      if (!groupVar) {
        throw new Error("Group attribute is not set for assumptions.");
      }
      if (!selectedVar) {
        throw new Error("Selected attribute is not set for assumptions.");
      }
      if (!Array.isArray(selection) || selection.length === 0) {
        throw new Error("No rows available in current selection.");
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
