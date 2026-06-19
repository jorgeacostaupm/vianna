import { createSlice } from "@reduxjs/toolkit";

import { updateData } from "../dataframe/thunks";
import {
  checkAssumptions,
  runAllComparisonTests,
  runComparisonTest,
} from "./thunks";

const initialState = {
  isNumeric: null,

  groupVar: null,
  idVar: null,
  timeVar: null,
  selectedVar: null,
  assumptions: {
    normality: null,
    equalVariance: null,
  },
  assumptionsLoading: false,
  assumptionsError: null,

  selectedTest: null,

  rankingResult: null,
  rankingLoading: false,
  error: null,

  testResult: null,
  testLoading: false,

  workspace: {
    views: [],
    layout: [],
    revision: 0,
  },
};

const compareSlice = createSlice({
  name: "compare",
  initialState,
  reducers: {
    setIsNumeric: (state, action) => {
      state.isNumeric = action.payload;
    },
    setGroupVar: (state, action) => {
      state.groupVar = action.payload;
    },
    setIdVar: (state, action) => {
      state.idVar = action.payload;
    },
    setTimeVar: (state, action) => {
      state.timeVar = action.payload;
    },
    setSelectedVar: (state, action) => {
      state.selectedVar = action.payload;
    },
    setSelectedTest: (state, action) => {
      state.selectedTest = action.payload;
    },
    setTestResult: (state, action) => {
      state.testResult = action.payload;
    },
    setWorkspace: (state, action) => {
      state.workspace = {
        views: Array.isArray(action.payload?.views) ? action.payload.views : [],
        layout: Array.isArray(action.payload?.layout)
          ? action.payload.layout
          : [],
        revision: (state.workspace?.revision ?? 0) + 1,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(runAllComparisonTests.pending, (state) => {
        state.rankingLoading = true;
        state.error = null;
      })
      .addCase(runAllComparisonTests.fulfilled, (state, action) => {
        state.rankingLoading = false;
        state.rankingResult = action.payload;
      })
      .addCase(runAllComparisonTests.rejected, (state, action) => {
        state.rankingLoading = false;
        state.error = action.payload || action.error.message;
      });

    builder
      .addCase(runComparisonTest.pending, (state) => {
        state.testLoading = true;
        state.error = null;
      })
      .addCase(runComparisonTest.fulfilled, (state, action) => {
        state.testLoading = false;
        state.testResult = action.payload;
      })
      .addCase(runComparisonTest.rejected, (state, action) => {
        state.testLoading = false;
        state.error = action.payload || action.error.message;
      });

    builder
      .addCase(checkAssumptions.pending, (state) => {
        state.assumptionsLoading = true;
        state.assumptionsError = null;
      })
      .addCase(checkAssumptions.fulfilled, (state, action) => {
        state.assumptionsLoading = false;
        state.assumptions = action.payload;
      })
      .addCase(checkAssumptions.rejected, (state, action) => {
        state.assumptionsLoading = false;
        state.assumptionsError = action.payload || action.error.message;
      });

    builder.addCase(updateData.fulfilled, (state) => {
      state.groupVar = null;
      state.idVar = null;
      state.timeVar = null;
      state.selectedVar = null;
      state.selectedTest = null;
      state.workspace = { views: [], layout: [], revision: 0 };
    });
  },
});

export default compareSlice.reducer;

export const {
  setIsNumeric,
  setGroupVar,
  setIdVar,
  setTimeVar,
  setSelectedVar,
  setSelectedTest,
  setTestResult,
  setWorkspace,
} = compareSlice.actions;

export {
  checkAssumptions,
  runAllComparisonTests,
  runComparisonTest,
} from "./thunks";
