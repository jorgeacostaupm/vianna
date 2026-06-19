import { createSlice } from "@reduxjs/toolkit";

import { updateData } from "../dataframe/thunks";
import { checkAssumptions } from "./thunks";

const initialState = {
  groupVar: null,
  idVar: null,
  timeVar: null,
  selectedVar: null,
  assumptions: {
    normality: null,
    equalVariance: null,
  },
  selectedTest: null,

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
    builder.addCase(checkAssumptions.fulfilled, (state, action) => {
      state.assumptions = action.payload;
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
  setGroupVar,
  setIdVar,
  setTimeVar,
  setSelectedVar,
  setSelectedTest,
  setWorkspace,
} = compareSlice.actions;

export { checkAssumptions } from "./thunks";
