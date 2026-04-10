import { createSlice } from "@reduxjs/toolkit";

import { updateData } from "../dataframe/thunks";
import {
  checkAssumptions,
  runAllComparisonTests,
  runComparisonTest,
} from "./thunks";

const initialState = {
  init: false,
  isNumeric: null,

  groupVar: null,
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
};

const compareSlice = createSlice({
  name: "compare",
  initialState,
  reducers: {
    setInit: (state, action) => {
      state.init = action.payload;
    },
    setIsNumeric: (state, action) => {
      state.isNumeric = action.payload;
    },
    setGroupVar: (state, action) => {
      state.groupVar = action.payload;
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
      state.selectedVar = null;
      state.selectedTest = null;
    });
  },
});

export default compareSlice.reducer;

export const {
  setInit,
  setIsNumeric,
  setGroupVar,
  setSelectedVar,
  setSelectedTest,
  setTestResult,
} = compareSlice.actions;

export {
  checkAssumptions,
  runAllComparisonTests,
  runComparisonTest,
} from "./thunks";
