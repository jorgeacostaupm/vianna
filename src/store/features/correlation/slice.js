import { createSlice } from "@reduxjs/toolkit";
import { updateData } from "../dataframe/thunks";

const initialState = {
  idVar: null,
  groupVar: null,
  timeVar: null,
  selectedChart: null,
  workspace: {
    views: [],
    layout: [],
    revision: 0,
  },
};

const correlationSlice = createSlice({
  name: "correlation",
  initialState,
  reducers: {
    setSelectedChart: (state, action) => {
      state.selectedChart = action.payload;
    },
    setIdVar: (state, action) => {
      state.idVar = action.payload;
    },
    setGroupVar: (state, action) => {
      state.groupVar = action.payload;
    },
    setTimeVar: (state, action) => {
      state.timeVar = action.payload;
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
    builder.addCase(updateData.fulfilled, (state) => {
      state.idVar = null;
      state.groupVar = null;
      state.timeVar = null;
      state.workspace = { views: [], layout: [], revision: 0 };
    });
  },
});

export default correlationSlice.reducer;
export const {
  setIdVar,
  setGroupVar,
  setTimeVar,
  setSelectedChart,
  setWorkspace,
} = correlationSlice.actions;
