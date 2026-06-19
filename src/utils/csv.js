export const getRowColumns = (rows) => [
  ...new Set((rows || []).flatMap((row) => Object.keys(row || {}))),
];

export function toCsv(rows, columns = getRowColumns(rows)) {
  if (!rows?.length || !columns.length) return "";
  const escape = (value) => {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [
    columns.map(escape),
    ...rows.map((row) => columns.map((column) => escape(row?.[column]))),
  ]
    .map((line) => line.join(","))
    .join("\n");
}
