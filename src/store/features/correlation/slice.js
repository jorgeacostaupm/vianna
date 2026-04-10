import { createSlice } from "@reduxjs/toolkit";
import { updateData } from "../dataframe/thunks";

const initialState = {
  init: false,
  groupVar: null,
  selectedChart: null,
};

const correlationSlice = createSlice({
  name: "correlation",
  initialState,
  reducers: {
    setInit: (state, action) => {
      state.init = action.payload;
    },
    setSelectedChart: (state, action) => {
      state.selectedChart = action.payload;
    },
    setGroupVar: (state, action) => {
      state.groupVar = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(updateData.fulfilled, (state) => {
      state.groupVar = null;
    });
  },
});

export default correlationSlice.reducer;
export const {
  setInit,
  setGroupVar,
  setSelectedChart,
} = correlationSlice.actions;
