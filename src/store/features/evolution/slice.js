import { createSlice } from "@reduxjs/toolkit";
import { updateData } from "../dataframe/thunks";
import { normalizeTimeOrderConfig } from "@/utils/evolutionTimeOrder";

const initialState = {
  idVar: null,
  groupVar: null,
  timeVar: null,
  selectedVar: null,
  timeOrderByVar: {},
  workspace: {
    views: [],
    layout: [],
    revision: 0,
  },
};

const evolutionSlice = createSlice({
  name: "evolution",
  initialState,
  reducers: {
    setSelectedVar: (state, action) => {
      state.selectedVar = action.payload;
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
      state.selectedVar = null;
      state.timeOrderByVar = {};
      state.workspace = { views: [], layout: [], revision: 0 };
    });
  },
});

export default evolutionSlice.reducer;
export const {
  setSelectedVar,
  setIdVar,
  setGroupVar,
  setTimeVar,
  setTimeOrderConfig,
  resetTimeOrderConfig,
  setWorkspace,
} = evolutionSlice.actions;
