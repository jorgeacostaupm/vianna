import {
  createSelectionRefForAllRows,
} from "./selectionRef";
import {
  buildMissingByAttribute,
  getAddedColumns,
  getRemovedColumns,
  selectionHasMissingInAttributes,
} from "./missingValues";

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
  state.dataframe = dataframe;
  state.selectionRef = createSelectionRefForAllRows(dataframe);
  state.missingByAttribute = buildMissingByAttribute(dataframe);
  state.hasEmptyValues = selectionHasMissingInAttributes({
    dataframe: state.dataframe,
    selectionRef: state.selectionRef,
    missingByAttribute: state.missingByAttribute,
    attributeIds: state.navioColumns,
  });
};

export const syncMissingStateForSelection = (state) => {
  state.hasEmptyValues = selectionHasMissingInAttributes({
    dataframe: state.dataframe,
    selectionRef: state.selectionRef,
    missingByAttribute: state.missingByAttribute,
    attributeIds: state.navioColumns,
  });
};

export const syncMissingStateForColumns = (state, nextColumns) => {
  const previousColumns = Array.isArray(state.navioColumns)
    ? state.navioColumns
    : [];
  const normalizedNextColumns = Array.isArray(nextColumns) ? nextColumns : [];

  if (areColumnsEqual(previousColumns, normalizedNextColumns)) return;

  const addedColumns = getAddedColumns(previousColumns, normalizedNextColumns);
  const removedColumns = getRemovedColumns(previousColumns, normalizedNextColumns);
  state.navioColumns = normalizedNextColumns;

  if (addedColumns.length > 0 && removedColumns.length === 0) {
    if (state.hasEmptyValues) return;
    state.hasEmptyValues = selectionHasMissingInAttributes({
      dataframe: state.dataframe,
      selectionRef: state.selectionRef,
      missingByAttribute: state.missingByAttribute,
      attributeIds: addedColumns,
    });
    return;
  }

  if (removedColumns.length > 0 && addedColumns.length === 0) {
    if (!state.hasEmptyValues) return;
    syncMissingStateForSelection(state);
    return;
  }

  syncMissingStateForSelection(state);
};
