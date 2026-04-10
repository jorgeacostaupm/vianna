import { createSlice } from "@reduxjs/toolkit";
import { updateData } from "../dataframe/thunks";
import { normalizeTimeOrderConfig } from "@/utils/evolutionTimeOrder";

const initialState = {
  init: false,
  groupVar: null,
  timeVar: null,
  selectedVar: null,
  timeOrderByVar: {},
};

const evolutionSlice = createSlice({
  name: "evolution",
  initialState,
  reducers: {
    setInit: (state, action) => {
      state.init = action.payload;
    },
    setSelectedVar: (state, action) => {
      state.selectedVar = action.payload;
    },
    setGroupVar: (state, action) => {
      state.groupVar = action.payload;
    },
    setTimeVar: (state, action) => {
      state.timeVar = action.payload;
    },
    setTimeOrderConfig: (state, action) => {
      const timeVar = action.payload?.timeVar;
      if (!timeVar) return;

      state.timeOrderByVar[timeVar] = normalizeTimeOrderConfig(
        action.payload?.config
      );
    },
    resetTimeOrderConfig: (state, action) => {
      const timeVar = action.payload;
      if (!timeVar) {
        state.timeOrderByVar = {};
        return;
      }

      delete state.timeOrderByVar[timeVar];
    },
  },

  extraReducers: (builder) => {
    builder.addCase(updateData.fulfilled, (state) => {
      state.groupVar = null;
      state.timeVar = null;
      state.selectedVar = null;
      state.timeOrderByVar = {};
    });
  },
});

export default evolutionSlice.reducer;
export const {
  setInit,
  setSelectedVar,
  setGroupVar,
  setTimeVar,
  setTimeOrderConfig,
  resetTimeOrderConfig,
} = evolutionSlice.actions;
