import { hasEmptyValues, pickColumns } from "@/utils/functions";

export const areColumnsEqual = (previousColumns = [], nextColumns = []) => {
  if (previousColumns === nextColumns) return true;
  if (!Array.isArray(previousColumns) || !Array.isArray(nextColumns)) {
    return false;
  }

  if (previousColumns.length !== nextColumns.length) return false;

  return previousColumns.every(
    (columnName, index) => columnName === nextColumns[index],
  );
};

export const syncSelectionFromDataframe = (state, dataframe) => {
  const selection = pickColumns(dataframe, state.navioColumns);
  state.dataframe = dataframe;
  state.selection = selection;
  hasEmptyValues(selection, state);
};
