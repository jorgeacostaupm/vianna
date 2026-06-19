import { compileAggregationFormula } from "@/store/features/metadata/utils/thunkUtils";

const generateFormula = (operation, attributes) => {
  if (operation === "custom") return;
  let formula = "";

  if (operation === "sum") {
    formula = attributes.map((n) => `$(${n.name})`).join(" + ");
  } else if (operation === "concat") {
    formula = attributes.map((n) => `string($(${n.name}))`).join(" + ");
  } else {
    let totalWeights = 0;
    formula = attributes
      .map((n) => {
        const weight = Number.isFinite(n.weight) ? n.weight : 1;
        totalWeights += weight;
        return `${weight} * $(${n.name})`;
      })
      .join(" + ");

    formula = `( ${formula} ) / ${totalWeights}`;
  }

  return formula;
};

export const generateFormulaSimplified = (operation, attributes) => {
  const formula = generateFormula(operation, attributes);
  const compiled = compileAggregationFormula(formula);
  if (!compiled.valid) {
    return { valid: false, msg: compiled.message || "Invalid formula." };
  }
  return { valid: true, formula };
};
