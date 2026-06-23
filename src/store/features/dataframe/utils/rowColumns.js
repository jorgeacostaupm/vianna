export const removeColumnsFromRows = (rows, columns) => {
  const columnsToRemove = new Set(
    (Array.isArray(columns) ? columns : [columns]).filter(Boolean),
  );

  if (!Array.isArray(rows) || columnsToRemove.size === 0) {
    return Array.isArray(rows) ? rows : [];
  }

  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;

    let changed = false;
    const nextRow = { ...row };

    columnsToRemove.forEach((column) => {
      if (Object.prototype.hasOwnProperty.call(nextRow, column)) {
        delete nextRow[column];
        changed = true;
      }
    });

    return changed ? nextRow : row;
  });
};

export const renameColumnInRows = (rows, prevName, newName) => {
  if (!Array.isArray(rows)) return [];
  if (!prevName || !newName || prevName === newName) return rows;

  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;
    if (!Object.prototype.hasOwnProperty.call(row, prevName)) return row;

    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key === prevName ? newName : key,
        value,
      ]),
    );
  });
};
