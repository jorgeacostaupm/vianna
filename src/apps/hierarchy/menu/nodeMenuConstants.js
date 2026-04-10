import { DataType } from "@/utils/Constants";

export const PREVIEW_LIMIT = 5;
export const PREVIEW_RESULT_COLUMN = "__preview_result__";
export const PREVIEW_ROW_COLUMN = "__preview_row__";
export const VARIABLE_VALUES_LIMIT = 5;

export const dtypeMap = {
  [DataType.NUMERICAL.dtype]: DataType.NUMERICAL.name,
  [DataType.TEXT.dtype]: DataType.TEXT.name,
  [DataType.UNKNOWN.dtype]: DataType.UNKNOWN.name,
};

export const dtypeColor = {
  [DataType.NUMERICAL.dtype]: DataType.NUMERICAL.color,
  [DataType.TEXT.dtype]: DataType.TEXT.color,
  [DataType.UNKNOWN.dtype]: DataType.UNKNOWN.color,
};
