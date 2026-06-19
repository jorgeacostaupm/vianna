import Numeric from "./Numeric/Numeric";
import Ranking from "./Ranking/Ranking";
import Categoric from "./Categoric/Categoric";
import { PointRange, Pairwise } from "./Test";
import { defineView } from "@/components/grid/viewDefinitions";

export default {
  pointrange: defineView(PointRange, {
    layout: { w: 10, h: 4, xBase: 10, yOffset: 0 },
  }),
  pairwise: defineView(Pairwise, {
    layout: { w: 10, h: 4 },
  }),
  numeric: defineView(Numeric, {
    layout: { w: 10, h: 4 },
  }),
  categoric: defineView(Categoric, {
    layout: { w: 10, h: 4 },
  }),
  ranking: defineView(Ranking, {
    layout: { w: 20, h: 4 },
  }),
};
