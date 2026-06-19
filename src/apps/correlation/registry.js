import CorrelationMatrix from "./CorrelationMatrix/CorrelationMatrix";
import ScatterMatrix from "./ScatterMatrix/ScatterMatrix";
import PCA from "./PCA/PCA";
import { defineView } from "@/components/grid/viewDefinitions";

export default {
  ["Correlation Matrix"]: defineView(CorrelationMatrix, {
    layout: { w: 12, h: 8 },
  }),
  ["Scatter Plot Matrix"]: defineView(ScatterMatrix, {
    layout: { w: 12, h: 8 },
  }),
  ["PCA"]: defineView(PCA, {
    layout: { w: 12, h: 8 },
  }),
};
