export const EDIT_VALUE_TYPE = {
  TEXT: "text",
  NUMBER: "number",
};

export function isValidEditNumber(value) {
  const text = String(value ?? "").trim();
  return text !== "" && Number.isFinite(Number(text));
}

export function resolveEditValue(value, valueType) {
  if (valueType !== EDIT_VALUE_TYPE.NUMBER) return value;
  if (!isValidEditNumber(value)) {
    throw new Error("Edit value must be a finite number.");
  }
  return Number(String(value).trim());
}
