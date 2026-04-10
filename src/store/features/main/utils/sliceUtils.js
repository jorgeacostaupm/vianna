import { getVariableTypes } from "@/utils/functions";
import { getDistinctValues } from "@/store/utils/collections";

export const syncSelectionContextFromItems = (
  state,
  items,
  { selectionOnly = false } = {},
) => {
  const groups = getDistinctValues(items, state.groupVar);
  const timestamps = getDistinctValues(items, state.timeVar);

  if (!selectionOnly) {
    state.groups = groups;
    state.timestamps = timestamps;
  }

  state.selectionGroups = groups;
  state.selectionTimestamps = timestamps;
};

export const applyGeneratedColumns = (state, action) => {
  const data = Array.isArray(action.payload?.data) ? action.payload.data : [];
  const quarantineData = Array.isArray(action.payload?.quarantineData)
    ? action.payload.quarantineData
    : [];

  state.quarantineData = quarantineData;
  state.varTypes = getVariableTypes(data);
};

export const resetMainDataContext = (state) => {
  state.quarantineData = [];
  state.quarantineSelection = [];

  state.timeVar = null;
  state.groupVar = null;
  state.idVar = null;

  state.ids = [];
  state.groups = [];
  state.timestamps = [];

  state.selectionIds = [];
  state.selectionGroups = [];
  state.selectionTimestamps = [];
};
