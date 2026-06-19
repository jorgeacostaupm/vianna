import { validateNodeForFormik } from "@/store/features/metadata/utils/thunkUtils";

export const validateNodeValues = (values, hierarchy) =>
  validateNodeForFormik(values, hierarchy);
